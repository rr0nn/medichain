"use client"

import Image from "next/image";
import styled from "styled-components";
import Link from 'next/link';
import data from '../../TestUiDatabase/differentials.json';

// const PageLayout = styled.div`
//   width: 100%;
//   min-height: 100vh;

//   display: flex;
//   flex-direction: row;
//   gap: 30px;
//   padding: 20px;
// `;

const ResultPage = styled.div`
  width: 100%;
  min-height: 100vh;
  text-align: center;
  background-color: #ffffff;

  display: flex;
  flex-direction: column;
  align-items: center;
`;


// const ChainLogic = styled.div`
//   width: %;
//   min-height: 100vh;
//   text-align: center;
//   background-color: #ad3333;

//   padding: 10px;
//   flex-direction: column;
//   align-items: flex-left;
// `;

const Header = styled.div`
  position: fixed;
  width: 100%;
  height: 120px;
  text-align: center;
  background-color: #ffffff;
  border-bottom: 2px solid #000000;
  box-shadow: 0px 7px 10px rgba(0, 0, 0, 0.3);
  font-size: 36px;
  font-weight: bold;

  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;


const DifferentialDiagnosis = styled.div`
  width: 50%;
  background-color: #ffffff;
  border-radius: 25px;
  margin-top: 105px;
  font-weight: bold;
  box-shadow: 0px 0px 15px rgba(0, 0, 0, 0.3);

  display: flex;
  flex-direction: column;
  align-items: center;  
`;

const BoxFormatingOverall = styled.div`
  display: flex;
  flex-direction: row;
`

const BoxFormatingColumn= styled.div`
  display: flex;
  flex-direction: column;
  width: 50%;
  padding-left: 25px;
`
const ConfidenceFormating = styled.div`
  display: flex;
  flex-direction: column;
  mergin-right: 80%;
  width: 50%;
  text-align: right;
  padding-right: 25px;
  color: #2e3f50;
  font-weight: 550;
`
const ConfidenceScoreFormating = styled.div`
  padding-top: 10px;
  text-align: right;
  color: #000000;
  font-weight: bold;
`

const BoxTitle = styled.div`
  color: #1B7D7E;
  font-size: 25px;
  text-align: left;
  margin-top: 10px;
  margin-left: 5%;
  width: 100%;
`

const ResultDisplay = styled.div`
  padding-top: 10px;
  font-size: 20px;
  margin-top: 30px;
  width: 94%;
  text-align: left;
  box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.3);
  border-radius: 25px;
  color: #1B7D7E;
`

const DiseaseName = styled.div`
  color: #000000;
  font-size: 17px;
`

const DxResult = styled.div`
  color: #000000;
  font-weight: normal;
  font-size: 17px;
`
const BarBackground = styled.div`
  margin-top: 10px;
  width: 100%;
  background: #c2d8da;
  border-radius: 20px;
  height: 24px;
  overflow: hidden;
`;

const BarFill = styled.div<{ widthpercent: number}>`
  width: ${(props) => props.widthpercent}%;
  background-image: linear-gradient(to right, #5fa7ff, #7bfee2); 
  height: 100%;
`;

const FormatPadding = styled.div`
  padding-left: 10px;
  padding-right: 10px;
`

const TraceMatch = styled.div`
  margin-top: 15px;
  color: #000000;
  font-weight: normal;
  font-size: 17px;
  border-radius: 40px;
  border: 3px solid #bdcdce;
  display: inline-block;
  padding-left: 10px;
  padding-right: 10px;
`

const FillerDiv = styled.div`
  margin-top: 10px;
`
import { ChevronRight , Pill , SquarePlus  } from 'lucide-react';
import { useState } from 'react';

export default function Home() {
  
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <>
    <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="fixed top-3.5 left-5 z-50 text-[28px] cursor-pointer"
        >
            ☰ 
        </button>
       
       <div
            className={`fixed  top-0 left-0 h-full w-70 bg-[#1BC2BD]/12 shadow-lg transform transition-transform duration-300
                ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
            <Link
                //onClick={createNewChat}
                href="/chatBot"
                className="flex gap-2 items-center w-full text-[16px] text-left p-4 mt-20 hover:bg-white cursor-pointer "
            > <SquarePlus size={16} />  New Chat
            </Link>
          <button
                className="flex gap-2 items-center w-full text-[16px] text-left p-4 mt-0 hover:bg-white cursor-pointer"
            > <Pill size={16} /> Diagnosis Output
            </button>
            <button
                className="flex gap-2 items-center w-full text-[16px] text-left p-4 mt-0 hover:bg-white cursor-pointer"
            > Your chats <ChevronRight size={16} />
            </button>
            <div className="absolute top-0 left-70 h-full w-[1px] bg-gray-200">
              </div>
       
        </div>

         <div className='fixed top-3 left-20 bg-[#1B7D7E] text-[18px] font-bold text-white p-2 px-4 rounded-3xl'>
            MediChain
            </div>
          
  <ResultPage>
      {/* <Header>
        <Image
          src="/medichain.png"
          alt="Medichain logo"
          width={200}
          height={200}
          style={{ position: "absolute", marginRight: "80%" }}
        />
        Diagnostic Reasoning For Final Results
        <LinkHome href="/">Back to ChatBot</LinkHome>
      </Header> */}
      <DifferentialDiagnosis>
        <BoxTitle>
          Ranked Output For Differential Diagnosis
        </BoxTitle>

        {data.differentials.map((d,index) => (
          <ResultDisplay key={d.diagnosisKey}>
          <BoxFormatingOverall>
            <BoxFormatingColumn>
              Rank {index + 1}
              <DiseaseName>
                {d.diagnosisName}
              </DiseaseName>
              <DxResult>
                {d.diagnosisKey}
              </DxResult>
            </BoxFormatingColumn>
            <ConfidenceFormating>
              Confidence
              <ConfidenceScoreFormating>
                {d.score*100}%
              </ConfidenceScoreFormating>
            </ConfidenceFormating>
          </BoxFormatingOverall>
        
          <FormatPadding>
            <BarBackground>
              <BarFill widthpercent={d.score*100}/>
            </BarBackground>

            <TraceMatch> {d.paths[0].clinicalPresentationKey} / {d.paths[0].categoryKey}</TraceMatch>
          </FormatPadding>
          <FillerDiv></FillerDiv>
        </ResultDisplay>
        ))}
  
        <FillerDiv></FillerDiv>
      </DifferentialDiagnosis>
    </ResultPage>
    </>
  );
}
